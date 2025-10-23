import React from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import myfetch from '../lib/myfetch'
import AuthUserContext from '../contexts/AuthUserContext'
import useWaiting from '../ui/useWaiting'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import AuthGuard from './AuthGuard'

export default function AuthGuard({ children, adminOnly = false }) {

  const { setAuthUser, authUser, setRedirectLocation } = React.useContext(AuthUserContext)
  const [status, setStatus] = React.useState('IDLE')

  const location = useLocation()
  const { showWaiting, Waiting } = useWaiting()
  const navigate = useNavigate()

  async function checkAuthUser() {
    if(setStatus) setStatus('PROCESSING')
    showWaiting(true)
    try {
      const authUser = await myfetch.get('/users/me')
      setAuthUser(authUser)
    }
    catch(error) {
      setAuthUser(null)
      console.error(error)
      navigate('/login', { replace: true })
    }
    finally {
      showWaiting(false)
      setStatus('DONE')
    }
  }

  React.useEffect(() => {
    // Salva a rota atual para posterior redirecionamento,
    // caso a rota atual não seja o próprio login
    if(! location.pathname.includes('login')) setRedirectLocation(location)

    checkAuthUser()
  }, [location])

  // Enquanto ainda não temos a resposta do back-end para /users/me,
  // exibimos um componente Waiting
  if(status === 'PROCESSING') return <Waiting />

  if(authUser) {
    if(adminOnly && authUser.is_admin) return children
    else if (adminOnly && !(authUser.is_admin)) return (
      <Box>
        <Typography variant="h2" color="error">
          Acesso negado
        </Typography>
      </Box>
    )
    else return children
  }
  else return <Navigate to="/login" replace />
  
}

export default function AppRoutes() {
  return <Routes>
    <Route path="/" element={ <Homepage /> } />

    <Route path="/login" element={ <Login /> } />

    <Route path="/cars" element={ <AuthGuard> <CarList /> </AuthGuard> } />
    <Route path="/cars/new" element={ <AuthGuard> <CarForm /> </AuthGuard> } />
    <Route path="/cars/:id" element={ <AuthGuard> <CarForm /> </AuthGuard> } />

    <Route path="/customers" element={ 
      <AuthGuard> <CustomerList /> </AuthGuard> 
    } />

    <Route path="/customers/new" element={ 
      <AuthGuard> <CustomerForm /> </AuthGuard>
    } />
    <Route path="/customers/:id" element={ 
      <AuthGuard> <CustomerForm /> </AuthGuard>  
    } />

    <Route path="/users" element={ 
      <AuthGuard adminOnly={true}> <UserList /> </AuthGuard> } 
    />
    <Route path="/users/new" element={ 
      <AuthGuard adminOnly={true}> <UserForm /> </AuthGuard> } 
    />
    <Route path="/users/:id" element={ 
      <AuthGuard adminOnly={true}> <UserForm /> </AuthGuard> } 
    />
    
  </Routes>
}