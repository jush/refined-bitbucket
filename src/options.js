import OptionsSync from 'webext-options-sync'

new OptionsSync().syncForm('#options-form')

new OptionsSync().getAll().then(options => {
    console.info(`refined-bitbucket: options ${options}`)
})
