
import React, { useState, useMemo } from 'react';
import {
    Type, Copy, Check, Sparkles, Zap, Flame, Ghost, Menu, AlignLeft,
    Bold, Italic, Hash, Skull, PenTool, Instagram, Twitter,
    MessageCircle, ArrowUpDown, RefreshCcw, Syringe, BoxSelect, Circle, Globe, Terminal, Heart, Cross
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useIsMobile } from '../../hooks/useIsMobile';
import { CategoryDropdown } from '../../components/CategoryDropdown';

// --- Types & Data ---

interface TextStyle {
    name: string;
    category: string;
    map?: string;
    generator?: (text: string) => string;
}

const NORMAL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// Generators
const zalgoChars = {
    up: ['\u030d', '\u030e', '\u0304', '\u0305', '\u033f', '\u0311', '\u0306', '\u0310', '\u0352', '\u0357', '\u0351', '\u0307', '\u0308', '\u030a', '\u0342', '\u0343', '\u0344', '\u034a', '\u034b', '\u034c', '\u0303', '\u0302', '\u030c', '\u0350', '\u0300', '\u0301', '\u030b', '\u030f', '\u0312', '\u0313', '\u0314', '\u033d', '\u0309', '\u0363', '\u0364', '\u0365', '\u0366', '\u0367', '\u0368', '\u0369', '\u036a', '\u036b', '\u036c', '\u036d', '\u036e', '\u036f', '\u033e', '\u035b', '\u0346', '\u031a'],
    mid: ['\u0315', '\u031b', '\u0340', '\u0341', '\u0358', '\u0321', '\u0322', '\u0327', '\u0328', '\u0334', '\u0335', '\u0336', '\u0337', '\u0338', '\u0360', '\u0361', '\u0362'],
    down: ['\u0316', '\u0317', '\u0318', '\u0319', '\u031c', '\u031d', '\u031e', '\u031f', '\u0320', '\u0324', '\u0325', '\u0326', '\u0329', '\u032a', '\u032b', '\u032c', '\u032d', '\u032e', '\u032f', '\u0330', '\u0331', '\u0332', '\u0333', '\u0339', '\u033a', '\u033b', '\u033c', '\u0345', '\u0347', '\u0348', '\u0349', '\u034d', '\u034e', '\u0353', '\u0354', '\u0355', '\u0356', '\u0359', '\u035a', '\u0323']
};

const generateZalgo = (text: string, intensity: number = 1) => {
    let result = '';
    for (const char of text) {
        result += char;
        if (char === ' ') continue;
        const counts = [
            Math.floor(Math.random() * 5 * intensity),
            Math.floor(Math.random() * 2 * intensity),
            Math.floor(Math.random() * 5 * intensity)
        ];
        ['up', 'mid', 'down'].forEach((pos, i) => {
            for (let j = 0; j < counts[i]; j++) {
                const arr = zalgoChars[pos as keyof typeof zalgoChars];
                result += arr[Math.floor(Math.random() * arr.length)];
            }
        });
    }
    return result;
};

const generateCursed = (text: string) => {
    const map = '̶̴̵ ';
    return text.split('').map(c => c + map[Math.floor(Math.random() * map.length)]).join('');
};

const STYLES: TextStyle[] = [
    // --- Serif ---
    { name: 'Bold', category: 'serif', map: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗' },
    { name: 'Italic', category: 'serif', map: '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧0123456789' },
    { name: 'Bold Italic', category: 'serif', map: '𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗' },
    { name: 'Serif Bold', category: 'serif', map: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗' },

    // --- Sans Serif ---
    { name: 'Sans Normal', category: 'sans', map: '𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫' },
    { name: 'Sans Bold', category: 'sans', map: '𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇𝟬𝟭𝟮𝟯𝟰𝟱𝟲𝟳𝟴𝟵' },
    { name: 'Sans Italic', category: 'sans', map: '𝘈𝘉𝘊𝘋𝘌𝘍𝘎𝘏𝘐𝘑𝘒𝘓𝘔𝘕𝘖𝘗𝘘𝘙𝘚𝘛𝘜𝘝𝘞𝘟𝘠𝘡𝘢𝘣𝘤𝘥𝘦𝘧𝘨𝘩𝘪𝘫𝘬𝘭𝘮𝘯𝘰𝘱𝘲𝘳𝘴𝘵𝘶𝘷𝘸𝘹𝘺𝘻0123456789' },
    { name: 'Sans Bold Italic', category: 'sans', map: '𝘼𝘽𝘾𝘿𝙀𝙁𝙂𝙃𝙄𝙅𝙆𝙇𝙈𝙉𝙊𝙋𝙌𝙍𝙎𝙏𝙐𝙑𝙒𝙓𝙔𝙕𝙖𝙗𝙘𝙙𝙚𝙛𝙜𝙝𝙞𝙟𝙠𝙡𝙢𝙣𝙤𝙥𝙦𝙧𝙨𝙩𝙪𝙫𝙬𝙭𝙮𝙯0123456789' },

    // --- Script / Cursive ---
    { name: 'Script', category: 'script', map: '𝒜𝐵𝒞𝒟𝐸𝐹𝒢𝐻𝐼𝒥𝒦𝐿𝑀𝒩𝒪𝒫𝒬𝑅𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝒶𝒷𝒸𝒹𝑒𝒻𝑔𝒽𝒾𝒿𝓀𝓁𝓂𝓃𝑜𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏0123456789' },
    { name: 'Bold Script', category: 'script', map: '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗' },
    { name: 'Curly', category: 'script', map: 'єχαмρℓє' }, // Simple placeholder

    // --- Fraktur / Tattoo ---
    { name: 'Fraktur', category: 'tattoo', map: '𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷0123456789' },
    { name: 'Bold Fraktur', category: 'tattoo', map: '𝕬𝕭𝕮𝕯𝕰𝕱𝕲𝕳𝕴𝕵𝕶𝕷𝕸𝕹𝕺𝕻𝕼𝕽𝕾𝕿𝖀𝖁𝖂𝖃𝖄𝖅𝖆𝖇𝖈𝖉𝖊𝖋𝖌𝖍𝖎𝖏𝖐𝖑𝖒𝖓𝖔𝖕𝖖𝖗𝖘𝖙𝖚𝖛𝖜𝖝𝖞𝖟𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗' },

    // --- Monospace / Code ---
    { name: 'Monospace', category: 'code', map: '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿' },
    { name: 'Fullwidth', category: 'code', map: 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９' },

    // --- Fancy / Double Struck ---
    { name: 'Double Struck', category: 'fancy', map: '𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚𝕛𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡' },
    { name: 'Greek Style', category: 'fancy', map: 'ΑΒCDΕFΓΗΙJΚLΜΝΟΡQΡSΤUνWΧΥΖαβcdεfγhιjκlμνopqrsτυvωxyζ0123456789' }, // Pseudo-greek map
    { name: 'Cyrillic Style', category: 'fancy', map: 'АБCDЕFGНІJКLМПОРQЯЅТЦVШХУZаьcdеfgніjкlмпopqгѕтцvшхyz0123456789' },
    { name: 'Thai Style', category: 'fancy', map: 'คЪcdēfງhijklmnopqrstuvwxyzคЪcdēfງhijklmnopqrstuvwxyz0123456789' }, // Approximation
    { name: 'Gothic Style', category: 'fancy', map: 'ȺƀcdēfǥħɨjklmnøpqrstuvwxyzȺƀcdēfǥħɨjklmnøpqrstuvwxyz0123456789' }, // Approximation for Gothic

    // --- Enclosed / Circles / Squares ---
    { name: 'Circled', category: 'enclosed', map: 'ⒶⒷⒸⒹⒺⒻⒼⒽⒾⒿⓀⓁⓂⓃⓄⓅⓆⓇⓈⓉⓊⓋⓌⓍⓎⓏⓐⓑⓒⓓⓔⓕⓖⓗⓘⓙⓚⓛⓜⓝⓞⓟⓠⓡⓢⓣⓤⓥⓦⓧⓨⓩ0①②③④⑤⑥⑦⑧⑨' },
    { name: 'Circled Negative', category: 'enclosed', map: '🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩🅐🅑🅒🅓🅔🅕🅖🅗🅘🅙🅚🅛🅜🅝🅞🅟🅠🅡🅢🅣🅤🅥🅦🅧🅨🅩⓿❶❷❸❹❺❻❼❽❾' },
    { name: 'Squared', category: 'enclosed', map: '🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉🄰🄱🄲🄳🄴🄵🄶🄷🄸🄹🄺🄻🄼🄽🄾🄿🅀🅁🅂🅃🅄🅅🅆🅇🅈🅉0123456789' },
    { name: 'Squared Negative', category: 'enclosed', map: '🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉🅰🅱🅲🅳🅴🅵🅶🅷🅸🅹🅺🅻🅼🅽🅾🅿🆀🆁🆂🆃🆄🆅🆆🆇🆈🆉0123456789' },
    { name: 'Parenthesized', category: 'enclosed', map: '⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵⒜⒝⒞⒟⒠⒡⒢⒣⒤⒥⒦⒧⒨⒩⒪⒫⒬⒭⒮⒯⒰⒱⒲⒳⒴⒵⑴⑵⑶⑷⑸⑹⑺⑻⑼' },

    // --- Small / Tiny ---
    { name: 'Small Caps', category: 'small', map: 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ0123456789' },
    { name: 'Superscript', category: 'small', map: 'ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾᵠᴿˢᵀᵁⱽᵂˣʸᶻᵃᵇᶜᵈᵉᶠᵍʰⁱʲᵏˡᵐⁿᵒᵖᵠʳˢᵗᵘᵛʷˣʸᶻ⁰¹²³⁴⁵⁶⁷⁸⁹' },
    { name: 'Subscript', category: 'small', map: 'ₐbcdₑfgₕᵢⱼₖₗₘₙₒₚqᵣₛₜᵤᵥwₓyzₐbcdₑfgₕᵢⱼₖₗₘₙₒₚqᵣₛₜᵤᵥwₓyz₀₁₂₃₄₅₆₇₈₉' },

    // --- Glitch / Cursed ---
    { name: 'Zalgo (Mini)', category: 'glitch', generator: (t) => generateZalgo(t, 0.4) },
    { name: 'Zalgo (Max)', category: 'glitch', generator: (t) => generateZalgo(t, 2) },
    { name: 'Glitch Line', category: 'glitch', generator: (t) => t.split('').map(c => c + '\u0336').join('') },
    { name: 'Cursed Text', category: 'cursed', generator: generateCursed },
    { name: 'Spooky', category: 'cursed', map: '₳฿₵ĐɆ₣₲ⱧłJ₭Ⱡ₥₦Ø₱QⱤ₴₮ɄV₩ӾɎⱫ₳฿₵ĐɆ₣₲ⱧłJ₭Ⱡ₥₦Ø₱QⱤ₴₮ɄV₩ӾɎⱫ0123456789' },
    { name: 'Strikethrough', category: 'glitch', generator: (t) => t.split('').map(c => c + '\u0336').join('') },
    { name: 'Slash Through', category: 'glitch', generator: (t) => t.split('').map(c => c + '\u0338').join('') },
    { name: 'Underline', category: 'glitch', generator: (t) => t.split('').map(c => c + '\u0332').join('') },
    { name: 'Double Underline', category: 'glitch', generator: (t) => t.split('').map(c => c + '\u0333').join('') },
    { name: 'Tilde Overlay', category: 'glitch', generator: (t) => t.split('').map(c => c + '\u0334').join('') },
    { name: 'Cross Hatch', category: 'glitch', generator: (t) => t.split('').map(c => c + '\u0337').join('') },
    { name: 'Arrows Below', category: 'glitch', generator: (t) => t.split('').map(c => c + '\u034e').join('') },
    { name: 'Wavy', category: 'glitch', generator: (t) => t.split('').map(c => c + '\u0330').join('') },

    // --- Instagram ---
    { name: 'Decorated 1', category: 'instagram', generator: (t) => `❖❀～ ${t} ～❀❖` },
    { name: 'Decorated 2', category: 'instagram', generator: (t) => `-=₪۩۞ ${t} ۞۩₪=-` },
    { name: 'Decorated 3', category: 'instagram', generator: (t) => `୨屮୧ ${t} ୨屮୧` },
    { name: 'Decorated 4', category: 'instagram', generator: (t) => `❧Ƹ̵̡Ӝ̵̨̄Ʒ☙ ${t} ❧Ƹ̵̡Ӝ̵̨̄Ʒ☙` },
    { name: 'Emoji Hearts', category: 'instagram', generator: (t) => `💝 ${t} 💝` },
    { name: 'Sparkles', category: 'instagram', generator: (t) => `✨ ${t} ✨` },
    { name: 'Arrows', category: 'instagram', generator: (t) => `»» ${t} ««` },
    { name: 'Brackets', category: 'instagram', generator: (t) => `【${t}】` },
    { name: 'Stars', category: 'instagram', generator: (t) => `★ ${t} ★` },
    { name: 'Hearts Between', category: 'instagram', generator: (t) => t.split('').join('♥') },

    // --- Weird / Fun ---
    {
        name: 'Upside Down', category: 'weird', generator: (t) => t.split('').reverse().map(c => {
            const i = NORMAL.indexOf(c);
            if (i === -1) return c;
            const ups = '∀qƆpƎℲפHIſʞ˥WNOԀQɹS┴∩ΛMX⅄Zɐqɔpǝɟƃɥᴉɾʞlɯuodbɹsʇnʌʍxʎz0123456789';
            return ups[i] || c;
        }).join('')
    },
    { name: 'Reverse', category: 'weird', generator: (t) => t.split('').reverse().join('') },
    { name: 'Mirrored', category: 'weird', map: 'AdↃbƎꟻGHIJK⅃MᴎOꟼQЯƧTUVWXYZadɔbɘᎸgʜiႱʞlmnoqpɿꙅƚuvwxyƹ01క్షƐ4მda8e' },
    { name: 'Wingdings', category: 'weird', map: 'b︎c︎d︎e︎f︎g︎h︎i︎j︎k︎l︎m︎n︎o︎p︎q︎r︎s︎t︎u︎v︎w︎x︎y︎z︎' }, // Pseudo
    { name: 'Palmistry', category: 'weird', map: '♄♭☾ᕲ€ϜᎶ♄♗♪ϰ↳ᗰℵ⊙ρᵠ☈∫†☋✓ω⌘⚧☡ꍏ♭☾ᕲ€ϜᎶ♄♗♪ϰ↳ᗰℵ⊙ρᵠ☈∫†☋✓ω⌘⚧☡0123456789' },
    { name: 'Manga', category: 'weird', map: '卂乃匚ᗪ乇千Ꮆ卄丨ﾌҜㄥ爪几ㄖ卩Ɋ尺丂ㄒㄩᐯ山乂ㄚ乙卂乃匚ᗪ乇千Ꮆ卄丨ﾌҜㄥ爪几ㄖ卩Ɋ尺丂ㄒㄩᐯ山乂ㄚ乙0123456789' },
    { name: 'Fairytale', category: 'weird', map: 'ᚣƂᛈDᛊ𝓯ᎶꖾᛨJᛕᚳᛗᚺᛜᚹᎤᏒᛢᛠᏌVᏔᚾᚴᛇᚣƂᛈDᛊ𝓯ᎶꖾᛨJᛕᚳᛗᚺᛜᚹᎤᏒᛢᛠᏌVᏔᚾᚴᛇ0123456789' },
    { name: 'Frizzle', category: 'weird', map: 'ÄßƇƉƐʄɢꞪƗᨸӃʟʍՌՕՔԶƦՖȶƱƲЩӼʏʐǟɮƈɖɛʄɢɦɨʝӄʟʍռօքզʀֆȶʊʋաӽʏʐ0123456789' },
    { name: 'Lefthanded', category: 'weird', generator: (t) => t.split('').map(c => c + '\u20D6').join('') },
    { name: 'Clouds', category: 'fancy', generator: (t) => t.split('').map(c => c + '\u0F87\u0F19').join('') },
    { name: 'Hearts / Love', category: 'fancy', generator: (t) => t.split('').join('♥') },
    { name: 'Hacker / Leet', category: 'code', generator: (t) => t.replace(/[aA]/g, '4').replace(/[eE]/g, '3').replace(/[iI]/g, '1').replace(/[oO]/g, '0').replace(/[sS]/g, '5').replace(/[tT]/g, '7') },

    // --- Custom / Creative (New) ---
    { name: 'Vaporwave Grid', category: 'fancy', generator: (t) => `『 ${t.split('').join(' ')} 』` },
    { name: 'Heavy Metal', category: 'weird', generator: (t) => t.replace(/[aA]/g, 'Ä').replace(/[oO]/g, 'Ö').replace(/[uU]/g, 'Ü').replace(/[eE]/g, 'Ë').replace(/[iI]/g, 'Ï') },
    { name: 'Currency Mode', category: 'weird', generator: (t) => t.replace(/[sS]/g, '$').replace(/[eE]/g, '€').replace(/[cC]/g, '¢').replace(/[lL]/g, '£').replace(/[yY]/g, '¥').replace(/[fF]/g, 'ƒ') },
    { name: 'Zigzag', category: 'fancy', generator: (t) => t.split('').map(c => c + '\u035B').join('') },
    { name: 'Wide Text', category: 'fancy', generator: (t) => t.split('').join('  ') },

    // --- Aesthetic & Blocks ---
    { name: 'Full Width Aesthetic', category: 'fancy', map: 'ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ０１２３４５６７８９' },
    { name: 'Monospace Typewriter', category: 'code', map: '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉0123456789' },
    {
        name: 'Visual Blocks', category: 'weird', generator: (t) => t.toUpperCase().split('').map(c => {
            const blocks: { [key: string]: string } = {
                'A': '█▀█', 'B': '█▀▄', 'C': '█▀▀', 'D': '█▀♞', 'E': '█▀▀', 'F': '█▀▀',
                'G': '█▀▀', 'H': '█▄█', 'I': '█', 'J': '▄▄█', 'K': '█▄█', 'L': '█▄▄',
                'M': '█▀▀█', 'N': '█▀█', 'O': '█▀█', 'P': '█▀█', 'Q': '█▀█', 'R': '█▀█',
                'S': '█▀▀', 'T': '▀█▀', 'U': '█▄█', 'V': '▀▄▀', 'W': '▀▄▀▄▀', 'X': '▀▄▀',
                'Y': '▀█▀', 'Z': '▀█▀'
            };
            return blocks[c] || c;
        }).join(' ')
    },
    { name: 'Arrow Strikethrough', category: 'glitch', generator: (t) => t.split('').map(c => c + '\u0362').join('') },

    // --- Glitch / Chaos ---
    {
        name: 'Zalgo Chaos', category: 'glitch', generator: (t) => {
            const marks = ['\u0300', '\u0301', '\u0302', '\u0303', '\u0304', '\u0305', '\u0306', '\u0307', '\u0308', '\u0309', '\u030A', '\u030B', '\u030C', '\u030D', '\u030E', '\u030F'];
            return t.split('').map(c => c + marks[Math.floor(Math.random() * marks.length)] + marks[Math.floor(Math.random() * marks.length)]).join('');
        }
    },
    {
        name: 'Glitch Noise', category: 'glitch', generator: (t) => {
            const noise = ['\u036C', '\u036D', '\u036E', '\u036F', '\u0488', '\u0489'];
            return t.split('').map(c => c + noise[Math.floor(Math.random() * noise.length)]).join('');
        }
    },
    { name: 'Ghost Text', category: 'glitch', generator: (t) => t.split('').map(c => c + '\u0362\u0363\u0364\u0365').join('') },
    { name: 'Demonic', category: 'cursed', generator: (t) => t.split('').map(c => c + '\u0321\u0322\u0328\u0334\u0335\u0336\u0337\u0338').join('') },

    // --- Discord Specific ---
    {
        name: 'Discord Block', category: 'discord', generator: (t) => t.split('').map(c => {
            if (c === ' ') return '   ';
            if (/[a-zA-Z]/.test(c)) {
                return String.fromCodePoint(0x1F1E6 + (c.toLowerCase().charCodeAt(0) - 97)) + ' ';
            }
            return c;
        }).join('')
    },
    { name: 'Discord Bold', category: 'discord', map: '𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗' },
    { name: 'Discord Italic', category: 'discord', map: '𝐴𝐵𝐶𝐷𝐸𝐹𝐺𝐻𝐼𝐽𝐾𝐿𝑀𝑁𝑂𝑃𝑄𝑅𝑆𝑇𝑈𝑉𝑊𝑋𝑌𝑍𝑎𝑏𝑐𝑑𝑒𝑓𝑔ℎ𝑖𝑗𝑘𝑙𝑚𝑛𝑜𝑝𝑞𝑟𝑠𝑡𝑢𝑣𝑤𝑥𝑦𝑧0123456789' },
    { name: 'Discord Bold Italic', category: 'discord', map: '𝑨𝑩𝑪𝑫𝑬𝑭𝑮𝑯𝑰𝑱𝑲𝑳𝑴𝑵𝑶𝑷𝑸𝑹𝑺𝑻𝑼𝑽𝑾𝑿𝒀𝒁𝒂𝒃𝒄𝒅𝒆𝒇𝒈𝒉𝒊𝒋𝒌𝒍𝒎𝒏𝒐𝒑𝒒𝒓𝒔𝒕𝒖𝒗𝒘𝒙𝒚𝒛𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗' },
    { name: 'Discord Small Caps', category: 'discord', map: 'ᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢᴀʙᴄᴅᴇғɢʜɪᴊᴋʟᴍɴᴏᴘǫʀsᴛᴜᴠᴡxʏᴢ0123456789' },
    { name: 'Discord Code', category: 'discord', generator: (t) => `\`${t}\`` },
    { name: 'Discord Code Block', category: 'discord', generator: (t) => `\`\`\`\n${t}\n\`\`\`` },
    { name: 'Discord Spoiler', category: 'discord', generator: (t) => `||${t}||` },
    { name: 'Discord Quote', category: 'discord', generator: (t) => `> ${t}` },
    { name: 'Discord Strikethrough', category: 'discord', generator: (t) => `~~${t}~~` },
    { name: 'Discord Underline', category: 'discord', generator: (t) => `__${t}__` },

    // --- Social specific ---
    { name: 'Instagram', category: 'instagram', map: '𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣01𝟸345678𝟿' },
    { name: 'Twitter Bold', category: 'twitter', map: '𝗕𝗼𝗹𝗱 𝗳𝗼𝗿 𝗧𝘄𝗶𝘁𝘁𝗲𝗿 𝗔𝗕𝗖𝗗𝗘𝗙𝗚𝗛𝗜𝗝𝗞𝗟𝗠𝗡𝗢𝗣𝗤𝗥𝗦𝗧𝗨𝗩𝗪𝗫𝗬𝗭𝗮𝗯𝗰𝗱𝗲𝗳𝗴𝗵𝗶𝗷𝗸𝗹𝗺𝗻𝗼𝗽𝗾𝗿𝘀𝘁𝘂𝘃𝘄𝘅𝘆𝘇' },
    { name: 'Discord Block', category: 'discord', generator: (t) => t.split('').map(c => c === ' ' ? '   ' : /[a-zA-Z]/.test(c) ? `:regional_indicator_${c.toLowerCase()}: ` : c).join('') },
].sort((a, b) => a.name.localeCompare(b.name));


const CATEGORIES = [
    { id: 'all', label: 'All Styles', icon: AlignLeft },
    { id: 'serif', label: 'Serif', icon: Type },
    { id: 'sans', label: 'Sans Serif', icon: Type },
    { id: 'script', label: 'Script / Cursive', icon: PenTool },
    { id: 'tattoo', label: 'Fraktur / Tattoo', icon: Skull },
    { id: 'code', label: 'Monospace / Code', icon: Terminal },
    { id: 'fancy', label: 'Fancy', icon: Sparkles },
    { id: 'enclosed', label: 'Bubbles / Squared', icon: BoxSelect },
    { id: 'small', label: 'Small / Tiny', icon: AlignLeft },
    { id: 'glitch', label: 'Glitch / Zalgo', icon: Zap },
    { id: 'cursed', label: 'Cursed / Scary', icon: Ghost },
    { id: 'weird', label: 'Weird / Fun', icon: ArrowUpDown },
    { id: 'instagram', label: 'Instagram', icon: Instagram },
    { id: 'twitter', label: 'Twitter', icon: Twitter },
    { id: 'discord', label: 'Discord', icon: MessageCircle },
];

export const TextTools: React.FC = () => {
    const isMobile = useIsMobile();
    const [text, setText] = useState('Type something...');
    const [activeCategory, setActiveCategory] = useState('all');
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const getConverted = (input: string, style: TextStyle) => {
        if (!input) input = 'Type something...';

        if (style.generator) {
            return style.generator(input);
        }

        if (style.map) {
            const mapArray = Array.from(style.map);
            const normalArray = Array.from(NORMAL);

            return Array.from(input).map(char => {
                const idx = normalArray.indexOf(char);
                return idx !== -1 ? mapArray[idx] : char;
            }).join('');
        }

        return input;
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const displayStyles = useMemo(() => activeCategory === 'all'
        ? STYLES
        : STYLES.filter(s => s.category === activeCategory), [activeCategory]);

    const categoryOptions = useMemo(() => CATEGORIES.map(c => ({ id: c.id, label: c.label })), []);

    return (
        <div className={`max-w-[1800px] mx-auto p-4 lg:p-6 animate-fade-in ${isMobile ? 'h-full flex flex-col' : 'h-[calc(100vh-100px)]'} space-y-6`}>
            {!isMobile && (
                <div className="text-center space-y-2 mb-4">
                    <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-indigo-600 flex items-center justify-center gap-3 font-unbounded">
                        <Type size={32} /> Fancy Text Tools
                    </h2>
                    <p className="text-zinc-400">Transform your text into stylish unicode formats.</p>
                </div>
            )}
            {isMobile && (
                <div className="flex flex-col gap-4 mb-4">
                    <div className="flex justify-center">
                        <CategoryDropdown
                            activeCategory={activeCategory}
                            onCategoryChange={setActiveCategory}
                            categories={categoryOptions}
                            direction="down"
                        />
                    </div>
                    <div className="relative group">
                        <input
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Type text here..."
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-center text-xl text-white outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-zinc-600 transition-all shadow-inner group-hover:border-zinc-700 font-sans"
                        />
                        {text !== 'Type something...' && text.length > 0 && (
                            <button
                                onClick={() => setText('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors text-xs uppercase font-bold tracking-wider"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className={`flex flex-col lg:flex-row gap-6 ${isMobile ? 'flex-1 overflow-hidden' : 'h-full'}`}>

                {/* Sidebar - Desktop Only */}
                {!isMobile && (
                    <div className="w-full lg:w-72 flex-shrink-0 bg-surface rounded-2xl border border-zinc-800 p-2 lg:p-4 space-y-1 lg:space-y-2 h-fit lg:h-full overflow-y-auto custom-scrollbar">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-3 mb-4 mt-2 hidden lg:block">Categories</h3>

                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeCategory === cat.id
                                    ? 'bg-primary/10 text-primary shadow-sm border border-primary/20'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                    }`}
                            >
                                <cat.icon size={16} className={activeCategory === cat.id ? 'text-primary' : 'text-zinc-500'} />
                                {cat.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Main Content */}
                <div className={`flex-1 flex flex-col min-w-0 bg-zinc-950/30 rounded-3xl border border-zinc-900 overflow-hidden shadow-2xl relative ${isMobile ? 'h-full' : ''}`}>

                    {/* Header / Input - Desktop Only */}
                    {!isMobile && (
                        <div className="p-6 border-b border-zinc-800 bg-surface/50 backdrop-blur-sm z-10 sticky top-0">
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Type your text here..."
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-5 py-4 text-xl text-white outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-zinc-600 transition-all shadow-inner group-hover:border-zinc-600 font-sans"
                                />
                                {text !== 'Type something...' && text.length > 0 && (
                                    <button
                                        onClick={() => setText('')}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white px-2 py-1 rounded hover:bg-zinc-800 transition-colors text-xs uppercase font-bold tracking-wider"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Results List */}
                    <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3 custom-scrollbar">
                        {displayStyles.length > 0 ? (
                            displayStyles.map((style, i) => {
                                const resultText = getConverted(text, style);
                                const key = `${style.name}-${i}`;
                                const isCopied = copiedIndex === i;

                                return (
                                    <div
                                        key={key}
                                        className="group relative bg-zinc-900/50 hover:bg-zinc-900 border border-zinc-900 hover:border-zinc-800 rounded-2xl p-4 lg:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-lg hover:shadow-black/50 hover:-translate-y-0.5"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-xl md:text-2xl text-zinc-200 mb-1 truncate font-medium font-sans ${isMobile ? 'text-center sm:text-left' : ''}`}>
                                                {resultText}
                                            </p>
                                            <div className={`flex items-center gap-2 ${isMobile ? 'justify-center sm:justify-start' : ''}`}>
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider bg-zinc-900/40 px-1.5 py-0.5 rounded border border-zinc-800 transition-colors">
                                                    {style.name}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={isMobile ? 'flex justify-center w-full sm:w-auto' : ''}>
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className={`shrink-0 transition-all ${isCopied ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100'}`}
                                                onClick={() => handleCopy(resultText, i)}
                                            >
                                                {isCopied ? (
                                                    <>
                                                        <Check size={16} className="mr-2" /> Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={16} className="mr-2" /> Copy
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-4">
                                <Ghost size={48} className="opacity-20" />
                                <p>No styles found for this category</p>
                            </div>
                        )}

                        <div className="h-10"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
