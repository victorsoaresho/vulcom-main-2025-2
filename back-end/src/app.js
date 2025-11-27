import dotenv from 'dotenv'
dotenv.config() // Carrega as variáveis de ambiente do arquivo .env

import express, { json, urlencoded } from 'express'
import cookieParser from 'cookie-parser'
import logger from 'morgan'
import cors from 'cors'

const app = express()

app.use(logger('dev'))
app.use(json())
app.use(urlencoded({ extended: false }))
app.use(cookieParser())

// Rate limiter: limita a quantidade de requisições que cada usuário/IP
// pode efetuar dentro de um determinado intervalo de tempo

    /*
    Vulnerabilidade: API4:2023 Consumo irrestrito de recursos
    Esta vulnerabilidade foi evitada no código com a implementação de um 
    rate limiter (express-rate-limit), que limita o número de requisições 
    para 20 por minuto, prevenindo ataques de força bruta e DoS.
    */
    // Rate limiter: limita a quantidade de requisições que cada usuário/IP
    // pode efetuar dentro de um determinado intervalo de tempo
import { rateLimit } from 'express-rate-limit'

    /*
    Vulnerabilidade: API4:2023 Consumo irrestrito de recursos
    Esta vulnerabilidade foi evitada de forma global para toda a API,
    incluindo as rotas /cars e /customers, limitando o número de
    requisições por IP a um máximo de 20 por minuto.
    */
const limiter = rateLimit({
 windowMs: 60 * 1000,    // Intervalo: 1 minuto
 limit: 20               // Máximo de 20 requisições
})


app.use(limiter)


    /*
    Vulnerabilidade: API8:2023 Má Configuração de Segurança
    Esta vulnerabilidade foi evitada através da configuração explícita de CORS,
    garantindo que:
    1. O acesso à API seja permitido apenas a origens confiáveis (process.env.ALLOWED_ORIGINS).
    2. Credenciais (incluindo o cookie HTTP-only) sejam transmitidas de forma segura,
    evitando acesso não autorizado de domínios externos.
    */
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS.split(','),
  credentials: true
}))

/*********** ROTAS DA API **************/
// import auth from './middleware/auth.js'
// app.use(auth)

import carsRouter from './routes/cars.js'
app.use('/cars', carsRouter)

import customersRouter from './routes/customers.js'
app.use('/customers', customersRouter)

import usersRouter from './routes/users.js'
app.use('/users', usersRouter)

export default app
