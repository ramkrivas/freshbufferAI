export const convertToValidFilename = (word: string) => {
    return word
        .replace(/[/|\\:*?"<>]/g, ' ')
        .replace(' ', '')
        .toLowerCase()
}
