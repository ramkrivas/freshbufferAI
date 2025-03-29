import { Divider, Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import PropTypes from 'prop-types'

// Project import
import AllowedDomains from '@/ui-component/extended/AllowedDomains'
import RateLimit from '@/ui-component/extended/RateLimit'

const Security = ({ dialogProps }) => {
    const theme = useTheme()

    return (
        <Stack direction='column' divider={<Divider sx={{ my: 0.5, borderColor: theme.palette.grey[900] + 25 }} />} spacing={4}>
            <RateLimit />
            <AllowedDomains dialogProps={dialogProps} />
            {/* <OverrideConfig dialogProps={dialogProps} /> */}
        </Stack>
    )
}

Security.propTypes = {
    dialogProps: PropTypes.object
}

export default Security
