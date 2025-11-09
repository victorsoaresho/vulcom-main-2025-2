import { ZodError } from 'zod'

export default function(schema) {
  return function(req, res, next) {
    try {
      // 1. Validação com Zod
      schema.parse(req.body)

      // 2. Validação passou
      next()

    } catch (error) {
      if (error instanceof ZodError) {
        // 3. Mapeia os erros Zod para um formato mais amigável (campo: mensagem)
        const errorMap = {}
        for(let i of error.issues) {
          // Guarda a mensagem de erro para o primeiro caminho (campo) que falhou a validação
          if(!errorMap[i.path[0]]) {
            errorMap[i.path[0]] = i.message
          }
        }
        
        // HTTP 400: Bad Request com a lista de erros
        res.status(400).send({
          message: 'Um ou mais campos estão com dados incorretos.',
          errors: errorMap
        })
      }
      else {
        // Outros erros inesperados
        console.error('Erro inesperado durante a validação:', error)
        res.status(500).end()
      }
    }
  }
}