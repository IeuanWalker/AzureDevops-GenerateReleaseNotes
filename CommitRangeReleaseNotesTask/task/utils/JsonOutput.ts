export async function printJson(data: object) {
    JSON.stringify(data, null, 2)
        .split('\n')
        .forEach(line => console.log(line));
}