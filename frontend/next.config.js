/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
}

// PWA desabilitado temporariamente — o service worker antigo estava bloqueando o carregamento.
// Para reabilitar em produção, descomentar o bloco abaixo e rodar `next build`.
// const withPWA = require('next-pwa')({ dest: 'public', register: true, skipWaiting: true, disable: process.env.NODE_ENV === 'development' })
// module.exports = withPWA(nextConfig)

module.exports = nextConfig
