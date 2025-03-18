class KeyCreator {

    constructor() {
        this.chars = process.env.KEY_CHARS;
        if (process.env.WITH_TO_UPPERCASE === 'true') {
            this.chars += this.chars.toUpperCase();
        }
        this.keyLength = parseInt(process.env.KEY_LENGTH);
    }

    create(keyLength, chars) {
        const length = keyLength || this.keyLength;
        const keyChars = chars || this.chars;
        let key = "";

        for (let i = 0; i < length; i++) {
            const random = Math.floor(Math.random() * keyChars.length);
            key += keyChars[random];
        }

        return key;
    }
}

module.exports = new KeyCreator();