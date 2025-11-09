import express from 'express'
import controller from '../controllers/cars.js'
import carSchema from '../models/Car.js'
import validate from '../middleware/validate.js' // << NOVO: Importa o middleware
import auth from '../middleware/auth.js'

const router = express.Router()

// Rotas protegidas (exigem autenticação)
router.post('/cars', auth, validate(carSchema), controller.create) // << NOVO: Aplica validate
router.get('/cars', auth, controller.retrieveAll)
router.get('/cars/:id', auth, controller.retrieveOne)
router.put('/cars/:id', auth, validate(carSchema), controller.update) // << NOVO: Aplica validate
router.delete('/cars/:id', auth, controller.delete)

export default router