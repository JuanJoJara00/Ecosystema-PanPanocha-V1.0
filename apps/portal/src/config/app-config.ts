// ------------------------------------------------------------------
// BRAND CONFIGURATION SWITCH
// Import the configuration of the brand you want to build/deploy here.
// ------------------------------------------------------------------
import { config as currentBrandConfig } from './brands/pan-panocha/config'

// Re-export as the application's global config
export const appConfig = currentBrandConfig

export const getCompanyName = () => appConfig.company.name
export const getCompanyLogo = () => appConfig.company.logoUrl

