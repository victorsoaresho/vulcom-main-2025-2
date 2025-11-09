import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFnsV3'
import { parseISO, isBefore, isAfter, startOfDay } from 'date-fns' // << NOVO: Importar funções de data
import { ptBR } from 'date-fns/locale/pt-BR'
import React from 'react'
import InputMask from 'react-input-mask'
import { useNavigate, useParams } from 'react-router-dom'
import myfetch from '../../lib/myfetch'
import useConfirmDialog from '../../ui/useConfirmDialog'
import useNotification from '../../ui/useNotification'
import useWaiting from '../../ui/useWaiting'
import { z } from 'zod' // << NOVO: Importa o Zod

// ===============================================
// INÍCIO: Definição do Zod Schema no Front-end
// ===============================================

const today = startOfDay(new Date())
const currentYear = today.getFullYear()
const shopOpeningDate = new Date(2020, 2, 20) // 20/03/2020

const colors = [
  'AMARELO', 'AZUL', 'BRANCO', 'CINZA', 'DOURADO', 'LARANJA',
  'MARROM', 'PRATA', 'PRETO', 'ROSA', 'ROXO', 'VERDE', 'VERMELHO',
]

const carSchema = z.object({
  brand: z.string()
    .min(1, { message: 'A marca deve ter pelo menos 1 caractere.' })
    .max(25, { message: 'A marca deve ter no máximo 25 caracteres.' }),

  model: z.string()
    .min(1, { message: 'O modelo deve ter pelo menos 1 caractere.' })
    .max(25, { message: 'O modelo deve ter no máximo 25 caracteres.' }),

  color: z.enum(colors, {
    required_error: 'A cor é obrigatória.',
    invalid_type_error: 'A cor deve ser uma das opções válidas.',
  }),

  year_manufacture: z.coerce.number({
    invalid_type_error: 'O ano de fabricação deve ser um número inteiro.',
    required_error: 'O ano de fabricação é obrigatório.'
  })
  .int({ message: 'O ano de fabricação deve ser um número inteiro.' })
  .min(1960, { message: 'O ano de fabricação não pode ser anterior a 1960.' })
  .max(currentYear, { message: `O ano de fabricação não pode ser posterior a ${currentYear}.` }),

  imported: z.boolean({
    required_error: 'A informação de importado é obrigatória.',
    invalid_type_error: 'O campo importado deve ser um valor booleano.',
  }),

  plates: z.string()
    .length(8, { message: 'A placa deve ter exatamente 8 caracteres, no formato AAA-9A99.' }),

  // Data de venda: Opcional. No front-end o DatePicker retorna null para data vazia, 
  // mas como o backend espera que se for null ele passe no coerce/preprocess, 
  // aqui usamos z.date().nullable() que já aceita null
  selling_date: z.date().nullable().superRefine((val, ctx) => {
    if (val) {
      const valStartOfDay = startOfDay(val)
      if (isBefore(valStartOfDay, shopOpeningDate)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A data de venda não pode ser anterior a 20/03/2020.',
          path: ['selling_date']
        })
      }
      if (isAfter(valStartOfDay, today)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A data de venda não pode ser posterior à data de hoje.',
          path: ['selling_date']
        })
      }
    }
  }),

  selling_price: z.coerce.number({
    invalid_type_error: 'O preço de venda deve ser um número.',
  })
  .nullable().superRefine((val, ctx) => {
    if (val !== null) {
      if (val < 5000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O preço de venda deve ser no mínimo R$ 5.000,00.',
          path: ['selling_price']
        })
      }
      if (val > 5000000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'O preço de venda deve ser no máximo R$ 5.000.000,00.',
          path: ['selling_price']
        })
      }
    }
  }),

  customer_id: z.coerce.number({
    required_error: 'O cliente é obrigatório.',
  })
  .int({ message: 'O ID do cliente deve ser um número inteiro.' })
  .min(1, { message: 'O cliente é obrigatório.' })
  .nullable(),

  // Ignorar outros campos que podem estar no objeto, mas não são parte da validação de entrada do formulário
  created_user_id: z.number().optional(),
  updated_user_id: z.number().optional(),
  id: z.number().optional(),
})
// ===============================================
// FIM: Definição do Zod Schema no Front-end
// ===============================================

export default function CarForm() {
  /*
    Por padrão, todos os campos do nosso formulário terão como
    valor inicial uma string vazia. A exceção é o campo:
    - `selling_date` que deve iniciar valendo null.
    - `imported` que deve iniciar valendo false.
    - `customer_id` que deve iniciar valendo '' ou null (para select).
  */
  const formDefaults = {
    brand: '',
    model: '',
    color: '',
    year_manufacture: '',
    imported: false, // Alterado para fazer parte do objeto car
    plates: '',
    selling_date: null,
    selling_price: '', // Alterado para string vazia para ser coerível a null no Zod
    customer_id: '' // Alterado para string vazia para ser coerível a null/number no Zod
  }

  const [state, setState] = React.useState({
    car: { ...formDefaults },
    formModified: false,
    customers: [],
    inputErrors: {},
  })
  const { car, customers, formModified, inputErrors } = state

  const params = useParams()
  const navigate = useNavigate()

  const { askForConfirmation, ConfirmDialog } = useConfirmDialog()
  const { notify, Notification } = useNotification()
  const { showWaiting, Waiting } = useWaiting()

  const colorsList = [ // Renomeado para não conflitar com a constante 'colors' do Zod
    { value: 'AMARELO', label: 'AMARELO' },
    { value: 'AZUL', label: 'AZUL' },
    { value: 'BRANCO', label: 'BRANCO' },
    { value: 'CINZA', label: 'CINZA' },
    { value: 'DOURADO', label: 'DOURADO' },
    { value: 'LARANJA', label: 'LARANJA' },
    { value: 'MARROM', label: 'MARROM' },
    { value: 'PRATA', label: 'PRATA' },
    { value: 'PRETO', label: 'PRETO' },
    { value: 'ROSA', label: 'ROSA' },
    { value: 'ROXO', label: 'ROXO' },
    { value: 'VERDE', label: 'VERDE' },
    { value: 'VERMELHO', label: 'VERMELHO' },
  ]

  const plateMaskFormatChars = {
    9: '[0-9]', // somente dígitos
    $: '[0-9A-J]', // dígito de 0 a 9 ou uma letra de A a J.
    A: '[A-Z]', //  letra maiúscula de A a Z.
  }

  const currentYearCalculated = new Date().getFullYear() // Renomeado
  const minYear = 1960
  const years = []
  for (let year = currentYearCalculated; year >= minYear; year--) {
    years.push(year)
  }

  // Removido estado "imported" separado. Agora é gerenciado via handleFieldChange/handleImportedChange.

  // Alterada para atualizar o objeto car e o estado formModified
  function handleFieldChange(event) {
    const carCopy = { ...car }
    carCopy[event.target.name] = event.target.value

    // Limpa o erro de validação para o campo modificado
    const errorsCopy = { ...inputErrors }
    delete errorsCopy[event.target.name]

    setState({ ...state, car: carCopy, formModified: true, inputErrors: errorsCopy })
  }

  // Função para lidar com a mudança do checkbox (boolean)
  function handleImportedChange(event) {
    const carCopy = { ...car }
    carCopy.imported = event.target.checked

    // Limpa o erro de validação para o campo modificado
    const errorsCopy = { ...inputErrors }
    delete errorsCopy.imported

    setState({ ...state, car: carCopy, formModified: true, inputErrors: errorsCopy })
  }

  // Função para lidar com a mudança da data
  function handleDateChange(value) {
    const carCopy = { ...car }
    carCopy.selling_date = value

    // Limpa o erro de validação para o campo modificado
    const errorsCopy = { ...inputErrors }
    delete errorsCopy.selling_date
    
    setState({ ...state, car: carCopy, formModified: true, inputErrors: errorsCopy })
  }

  async function handleFormSubmit(event) {
    event.preventDefault(); // Evita que a página seja recarregada
    showWaiting(true); // Exibe a tela de espera
    
    // ===============================================
    // NOVO: Etapa 1: Validação dos dados no Front-end
    // ===============================================
    try {
      // 1. Prepara os dados para validação e envio
      const dataToValidate = {
        ...car,
        // O DatePicker retorna um objeto Date ou null.
        // O TextField de preço retorna uma string (pode ser vazia).
        // O Checkbox retorna um booleano.
      }
      
      // 2. Tenta fazer o parse/validação
      const validationResult = carSchema.safeParse(dataToValidate)
      
      if (!validationResult.success) {
        // Se a validação falhar, extrai e armazena os erros
        const errors = validationResult.error.issues.reduce((acc, issue) => {
          // O path[0] é o nome do campo
          if (!acc[issue.path[0]]) {
            acc[issue.path[0]] = issue.message
          }
          return acc
        }, {})

        setState({ ...state, inputErrors: errors })
        notify('Houve um erro de validação no formulário.', 'error')
        showWaiting(false)
        return // Encerra a função se a validação local falhar
      }

      // Se a validação local passar, usa os dados "parsed" (coeridos) para o envio
      const finalData = validationResult.data;

      // Se houver parâmetro na rota, estamos modificando (PUT)
      if (params.id) {
        await myfetch.put(`/cars/${params.id}`, finalData)
      }
      // Caso contrário, estamos criando um novo (POST)
      else {
        await myfetch.post('/cars', finalData)
      }

      // Deu certo, exibe a mensagem de feedback
      notify('Item salvo com sucesso.', 'success', 4000, () => {
        navigate('..', { relative: 'path', replace: true })
      })

    } catch (error) {
      console.error(error)
      // Se for um erro de validação do back-end (HTTP 400), exibe as mensagens
      if (error.status === 400 && error.body.errors) {
        setState({ ...state, inputErrors: error.body.errors })
        notify('Erro de validação: ' + error.body.message, 'error')
      } else {
        // Outro erro de rede ou servidor
        notify(error.message || 'Ocorreu um erro inesperado.', 'error')
      }
    } finally {
      // Desliga a tela de espera
      showWaiting(false)
    }
  }

  /*
    useEffect() que é executado apenas uma vez, no carregamento do componente.
    Busca dados de clientes e, se for edição, busca os dados do carro.
  */
  React.useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    showWaiting(true)
    try {

      let car = { ...formDefaults }, customers = []

      // Busca a lista de clientes
      customers = await myfetch.get('/customers')

      // Se houver parâmetro na rota, precisamos buscar o carro para edição
      if(params.id) {

        const fetchedCar = await myfetch.get(`/cars/${params.id}`)

        // Garante que selling_price seja null ou um número para o formulário
        fetchedCar.selling_price = fetchedCar.selling_price ?? ''

        // Converte o formato de data do banco (ISO string) para objeto Date
        if(fetchedCar.selling_date) {
          fetchedCar.selling_date = parseISO(fetchedCar.selling_date)
        }
        
        car = { ...car, ...fetchedCar }
      }

      setState({ ...state, car, customers })

    } catch (error) {
      console.error(error)
      notify(error.message, 'error')
    } finally {
      showWaiting(false)
    }
  }

  async function handleBackButtonClick() {
    if (
      formModified &&
      !(await askForConfirmation(
        'Há informações não salvas. Deseja realmente sair?'
      ))
    )
      return; // Sai da função sem fazer nada

    // Navega de volta para a página de listagem
    navigate('..', { relative: 'path', replace: true })
  }

  function handleKeyDown(event) {
    if(event.key === 'Delete') {
      const stateCopy = {...state}
      // Se pressionar DEL no campo de cliente, seta para null (para o backend) e 
      // para string vazia (para o select do frontend)
      stateCopy.car.customer_id = '' 
      setState(stateCopy)
    }
  }

  // Correção: A prop `checked` do Checkbox deve ser `car.imported`
  // O value deve ser o valor booleano do campo, não a atribuição `(car.imported = imported)`
  return (
    <>
      <ConfirmDialog />
      <Notification />
      <Waiting />

      <Typography variant='h1' gutterBottom>
        {params.id ? `Editar carro #${params.id}` : 'Cadastrar novo carro'}
      </Typography>

      <Box className='form-fields'>
        <form onSubmit={handleFormSubmit}>
          <TextField
            name='brand'
            label='Marca do carro'
            variant='filled'
            required
            fullWidth
            value={car.brand}
            onChange={handleFieldChange}
            helperText={inputErrors?.brand}
            error={!!inputErrors?.brand}
          />
          <TextField
            name='model'
            label='Modelo do carro'
            variant='filled'
            required
            fullWidth
            value={car.model}
            onChange={handleFieldChange}
            helperText={inputErrors?.model}
            error={!!inputErrors?.model}
          />

          <TextField
            name='color'
            label='Cor'
            variant='filled'
            required
            fullWidth
            value={car.color}
            onChange={handleFieldChange}
            select
            helperText={inputErrors?.color}
            error={!!inputErrors?.color}
          >
            {colorsList.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            name='year_manufacture'
            label='Ano de fabricação'
            variant='filled'
            required
            fullWidth
            select
            value={car.year_manufacture}
            onChange={handleFieldChange}
            helperText={inputErrors?.year_manufacture}
            error={!!inputErrors?.year_manufacture}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </TextField>

          <div class="MuiFormControl-root">
            <FormControlLabel
              control={
                <Checkbox
                  name='imported'
                  checked={car.imported} // << CORRIGIDO: Usa diretamente o valor do objeto car
                  onChange={handleImportedChange} // << CORRIGIDO: Nova função de manipulador
                  color='primary'
                />
              }
              label='Importado'
            />
          </div>

          <InputMask
            mask='AAA-9$99'
            formatChars={plateMaskFormatChars}
            maskChar=' '
            value={car.plates}
            onChange={handleFieldChange}
          >
            {() => (
              <TextField
                name='plates'
                label='Placa'
                variant='filled'
                required
                fullWidth
                helperText={inputErrors?.plates || 'Formato: AAA-9A99'}
                error={!!inputErrors?.plates}
              />
            )}
          </InputMask>

          <LocalizationProvider
            dateAdapter={AdapterDateFns}
            adapterLocale={ptBR}
          >
            <DatePicker
              label='Data de venda'
              value={car.selling_date}
              onChange={handleDateChange} // << CORRIGIDO: Chama a nova função de manipulador
              slotProps={{
                textField: {
                  variant: 'filled',
                  fullWidth: true,
                  helperText: inputErrors?.selling_date,
                  error: !!inputErrors?.selling_date,
                },
              }}
            />
          </LocalizationProvider>

          <TextField
            name='selling_price'
            label='Preço de venda'
            variant='filled'
            type='number'
            fullWidth
            value={car.selling_price}
            onChange={handleFieldChange}
            helperText={inputErrors?.selling_price || 'Opcional. Entre R$ 5.000,00 e R$ 5.000.000,00'}
            error={!!inputErrors?.selling_price}
          />

          <TextField
            name='customer_id'
            label='Cliente'
            variant='filled'
            required
            fullWidth
            value={car.customer_id ?? ''} // Usa '' para garantir que o select funcione se for null
            onChange={handleFieldChange}
            onKeyDown={handleKeyDown}
            select
            helperText={inputErrors?.customer_id || 'Obrigatório. Tecle DEL para limpar o cliente'}
            error={!!inputErrors?.customer_id}
          >
            {customers.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-around',
              width: '100%',
            }}
          >
            <Button variant='contained' color='secondary' type='submit'>
              Salvar
            </Button>
            <Button variant='outlined' onClick={handleBackButtonClick}>
              Voltar
            </Button>
          </Box>
        </form>
      </Box>
    </>
  )
}