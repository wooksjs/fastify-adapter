import pkg from './package.json'
import { dye, TDyeColor, TDyeModifier } from '@prostojs/dye'
const dyeModifiers: TDyeModifier[] = ['dim', 'bold', 'underscore', 'inverse', 'italic', 'crossed']
const dyeColors: TDyeColor[] = ['red', 'green', 'cyan', 'blue', 'yellow', 'white', 'magenta', 'black']

function createDyeReplaceConst() {
    const c = dye('red')
    const bg = dye('bg-red')
    const dyeReplacements = {
        '__DYE_RESET__': '\'' + dye.reset + '\'',
        '__DYE_COLOR_OFF__': '\'' + c.close + '\'',
        '__DYE_BG_OFF__': '\'' + bg.close + '\'',
    }
    dyeModifiers.forEach(v => {
        dyeReplacements[`__DYE_${ v.toUpperCase() }__`] = '\'' + dye(v).open + '\''
        dyeReplacements[`__DYE_${ v.toUpperCase() }_OFF__`] = '\'' + dye(v).close + '\''
    })
    dyeColors.forEach(v => {
        dyeReplacements[`__DYE_${ v.toUpperCase() }__`] = '\'' + dye(v).open + '\''
        dyeReplacements[`__DYE_BG_${ v.toUpperCase() }__`] = '\'' + dye(('bg-' + v) as TDyeColor).open + '\''
        dyeReplacements[`__DYE_${ v.toUpperCase() }_BRIGHT__`] = '\'' + dye((v + '-bright') as TDyeColor).open + '\''
        dyeReplacements[`__DYE_BG_${ v.toUpperCase() }_BRIGHT__`] = '\'' + dye(('bg-' + v + '-bright') as TDyeColor).open + '\''
    })
    return dyeReplacements
}

function createProjectReplaceConst() {
    return {
        __VERSION__: `'${pkg.version}'`,
    }
}

export default {
    ...createDyeReplaceConst(),
    ...createProjectReplaceConst(),
}
