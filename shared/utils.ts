
export * from './Copyable';

// https://stackoverflow.com/a/36963945
export function range(begin: number, end: number) : number[]
{
    return Array.from({length: (end - begin) + 1}, (v, k) => k + begin);
}

export function clamp(v: number, mn: number, mx: number): number
{
    return Math.max(mn, Math.min(mx, v));
}

// https://stackoverflow.com/a/3426956
export function hash_code(str: string) : number
{
    var hash: number = 0;

    for (var i = 0; i < str.length; i++)
       hash = str.charCodeAt(i) + ((hash << 5) - hash);

    return hash;
}

export function number_to_color(i: number) : string
{
    const c = (i & 0x00FFFFFF)
                .toString(16)
                .toUpperCase();

    return "00000".substring(0, 6 - c.length) + c;
}

export function string_to_color(str: string) : string
{
    return number_to_color(hash_code(str));
}

export function hex_to_RGB(hex: string) : number[]
{
    const rgbs = hex.match(/.{1,2}/g);
    const rgb: number[] = [
        parseInt(rgbs![0], 16),
        parseInt(rgbs![1], 16),
        parseInt(rgbs![2], 16)
    ];

    return rgb;
}

export function RGB_to_hex(r: number, g: number, b: number) : string
{
    return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function RGB_to_HSV(r: number, g: number, b: number) : number[]
{
  r /= 255;
  g /= 255;
  b /= 255;

  var max: number = Math.max(r, g, b);
  var min: number = Math.min(r, g, b);
  var h: number = max;
  var s: number = max;
  var v: number = max;

  var d: number = max - min;
  s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }

    h /= 6;
  }

  return [ h, s, v ];
}

export function luma(rgb: number[]) : number
{
    return (0.2126 * rgb![0]) + (0.7152 * rgb![1]) + (0.0722 * rgb![2]);
}

// takes a hex color and returns a good hex text color to put on top of it
export function complementary_text_color(col: string) : string
{
    const rgb = hex_to_RGB(col);
    //const hsv = RGB_to_HSV(rgb![0], rgb![1], rgb![2]);
    const lu = luma(rgb);

    //if (hsv![2] < 0.5)
    if (lu < 165)
        return "FFFFFF";
    else
        return "000000";
}

// https://stackoverflow.com/a/11252167
export function treat_as_UTC(d: Date): Date
{
    var result = d;
    result.setMinutes(result.getMinutes() - result.getTimezoneOffset());
    return result;
}

export function get_days(d: Date): number
{
    const millisecondsPerDay = 24 * 60 * 60 * 1000;
    return Math.trunc(d.getTime() / millisecondsPerDay);
}

export function get_hours(d: Date): number
{
    const range = 60 * 60 * 1000;
    return Math.trunc(d.getTime() / range);
}

export function get_minutes(d: Date): number
{
    const range = 60 * 1000;
    return Math.trunc(d.getTime() / range);
}

export function get_duration_text(df: Date): string
{
    const days = get_days(df);

    if (days >= 1)
        return `${days} days ago`;

    const hours = get_hours(df);
    const minutes = df.getMinutes();

    var ret: string = "";
    
    // im sure this could be easier. i just do not care.
    if (hours == 0 && minutes > 0)
    {
        ret += `${minutes} minute`;

        if (minutes > 1)
            ret += 's';

        ret += " ago";
    }
    else if (hours == 0)
        ret = `just now`;
    else if (hours > 0)
    {
        ret = `${hours} hour`;
        if (hours > 1)
            ret += 's';

        if (minutes > 0)
        {
            ret += ` and ${minutes} minute`;

            if (minutes > 1)
                ret += 's';
        }

        ret += " ago";
    }

    return ret;
}

export function get_duration_text_since(d: Date): string
{
    return get_duration_text(new Date(new Date().getTime() - d.getTime()));
}


// https://stackoverflow.com/a/11252167
export function days_between(startDate: Date, endDate: Date): number
{
    return get_days(new Date(treat_as_UTC(endDate).getTime() - treat_as_UTC(startDate).getTime()));
}

// i am deeply repulsed by the fact that this is not implemented by default
// in the prototype of array.
// fuck you webdevs, fuck you mozilla, fuck you google, fuck you w3c, fuck everyone.
export function remove_if(list: any, condition: any)
{
    var i = list.length;
    while (i--)
        if (condition(list[i], i))
            list.splice(i, 1);
};

export function empty_or_nothing(x: any)
{
    if (x === null || x === undefined)
        return true;

    const t = typeof x;
    if (t === "object" || t === "string")
    {
        for (const _ in x)
            return false;

        return true;
    }

    return false;
}

export function abbreviate_name(name: string): string
{
    if (name === null || name === undefined || name.length <= 0)
        return "";

    return name.split(" ")
               .map(n => n[0])
               .join("");
}
