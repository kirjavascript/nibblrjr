import { interpolateRainbow } from 'd3-scale-chromatic';

function adler32(str) {
    const [a, b] = [...str].reduce(
        ([a, b], cur) => {
            const next = (a + cur.charCodeAt()) % 0xfff1;
            return [next, (b + next) % 0xfff1];
        },
        [1, 0],
    );
    return (b << 0x10) | a;
}

export default function color(str) {
    return interpolateRainbow(adler32(str) / 32640);
}
