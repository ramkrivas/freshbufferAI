import { lazy } from 'react'

// project imports
import MainLayout from '@/layout/MainLayout'
import Loadable from '@/ui-component/loading/Loadable'


// agents routing
const Agentflows = Loadable(lazy(() => import('@/views/agentflows')))





// ==============================|| MAIN ROUTING ||============================== //

const MainRoutes = {
    path: '/',
    element: <MainLayout />,
    children: [
        {
            path: '/',
            element: <Agentflows />
        },
        {
            path: '/agentflows',
            element: <Agentflows />
        },


    ]
}

export default MainRoutes
