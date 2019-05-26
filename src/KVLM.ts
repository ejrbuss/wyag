const parse = (raw: string | Buffer, start: number = 0, ctx?: Map<string, string[]>): Map<string, string[]> => {

    raw = raw.toString();

    if (!ctx) {
        ctx = new Map();
    }
    
    const space   = raw.indexOf(' ', start);
    const newLine = raw.indexOf('\n', start);

    // Base case
    if (space < 0 || newLine < space) {
        ctx.set('', [raw.slice(start)]);
        return ctx;
    }
    
    // Recursive Case
    const key = raw.slice(start, space);
    let end = start;
    for (;;) {
        end = raw.indexOf('\n', end + 1);
        if (raw[end + 1] !== ' ') {
            break;
        }
    }
    const value = raw.slice(space + 1, end).replace(/\n /g, '\n');
    const values = ctx.get(key);
    if (!values) {
        ctx.set(key, [value]);
    } else {
        values.push(value);
    }
    return parse(raw, end + 1, ctx);
};

const stringify = (ctx: Map<string, string[]>): string => {
    let raw = '';

    // Output fields
    ctx.forEach((values, key) => {
        if (key === '') {
            return;
        }
        values.forEach(value => {
            raw += key + ' ' + value.replace(/\n/g, '\n ') + '\n';
        });
    });

    // Message
    const message = ctx.get('');
    if (message) {
        raw += message[0];
    }
    return raw;
};

export default {
    parse, 
    stringify,
};