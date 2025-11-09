import { z } from 'zod'

// Cálculo do ano corrente para o limite máximo de fabricação
const today = new Date()
const currentYear = today.getFullYear()
// Data de abertura da loja (20/03/2020) para comparação de data de venda
const shopOpeningDate = new Date(2020, 2, 20) // Mês 2 é Março (0-indexado)

// Lista de cores permitidas
const colors = [
  'AMARELO',
  'AZUL',
  'BRANCO',
  'CINZA',
  'DOURADO',
  'LARANJA',
  'MARROM',
  'PRATA',
  'PRETO',
  'ROSA',
  'ROXO',
  'VERDE',
  'VERMELHO',
]

const carSchema = z.object({
  // Campo brand: no mínimo 1 e no máximo 25 caracteres.
  brand: z.string({
    required_error: 'A marca é obrigatória.',
    invalid_type_error: 'Formato de marca inválido.',
  })
  .min(1, { message: 'A marca deve ter pelo menos 1 caractere.' })
  .max(25, { message: 'A marca deve ter no máximo 25 caracteres.' }),

  // Campo model: no mínimo 1 e no máximo 25 caracteres.
  model: z.string({
    required_error: 'O modelo é obrigatório.',
    invalid_type_error: 'Formato de modelo inválido.',
  })
  .min(1, { message: 'O modelo deve ter pelo menos 1 caractere.' })
  .max(25, { message: 'O modelo deve ter no máximo 25 caracteres.' }),

  // Campo color: exatamente um dos valores da lista.
  color: z.enum(colors, {
    required_error: 'A cor é obrigatória.',
    invalid_type_error: 'A cor deve ser uma das opções válidas.',
  }),

  // Campo year_manufacture: número inteiro entre 1960 e o ano corrente.
  // z.coerce.number trata a string recebida do formulário.
  year_manufacture: z.coerce.number({
    required_error: 'O ano de fabricação é obrigatório.',
    invalid_type_error: 'O ano de fabricação deve ser um número inteiro.',
  })
  .int({ message: 'O ano de fabricação deve ser um número inteiro.' })
  .min(1960, { message: 'O ano de fabricação não pode ser anterior a 1960.' })
  .max(currentYear, { message: `O ano de fabricação não pode ser posterior a ${currentYear}.` }),

  // Campo imported: deve ser um valor booleano (true ou false).
  imported: z.boolean({
    required_error: 'A informação de importado é obrigatória.',
    invalid_type_error: 'O campo importado deve ser um valor booleano.',
  }),

  // Campo plates: deve ter exatamente 8 caracteres.
  plates: z.string({
    required_error: 'A placa é obrigatória.',
    invalid_type_error: 'Formato de placa inválido.',
  })
  .length(8, { message: 'A placa deve ter exatamente 8 caracteres, no formato AAA-9A99.' }),

  // Campo selling_date: data, OPCIONAL. Valida o intervalo se informada.
  selling_date: z.preprocess((arg) => {
    // Converte string vazia/null/undefined para null para a regra optional/nullable
    if (arg === null || arg === undefined || arg === '') return null
    if (typeof arg === 'string' || arg instanceof Date) {
      // Converte para objeto Date. Ajusta para o início do dia para comparação.
      const date = new Date(arg)
      if (isNaN(date.getTime())) return arg
      return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    }
    return arg
  }, z.date().nullable().superRefine((val, ctx) => {
    if (val) {
      const todayStartOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())

      // Não pode ser anterior a 20/03/2020
      if (val < shopOpeningDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A data de venda não pode ser anterior a 20/03/2020.',
          path: ['selling_date']
        })
      }
      // Não pode ser posterior a hoje
      if (val > todayStartOfDay) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'A data de venda não pode ser posterior à data de hoje.',
          path: ['selling_date']
        })
      }
    }
  })),

  // Campo selling_price: OPCIONAL. Valida o intervalo se informado.
  selling_price: z.preprocess(
    (val) => val === '' ? null : val, // Converte string vazia para null
    z.coerce.number({
      invalid_type_error: 'O preço de venda deve ser um número.',
    }).nullable().superRefine((val, ctx) => {
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
    })
  ),

  // Campo customer_id: Requerido pelo formulário, mas nullable para permitir a lógica do DELETE key.
  customer_id: z.preprocess(
    (val) => val === '' ? null : val, // Converte string vazia para null
    z.coerce.number({
      required_error: 'O cliente é obrigatório.',
      invalid_type_error: 'Formato de ID de cliente inválido.',
    })
    .int({ message: 'O ID do cliente deve ser um número inteiro.' })
    .min(1, { message: 'O ID do cliente é inválido.' })
    .nullable()
  )
})

export default carSchema