const limit = (func, amount = 10) => {
    let count = 0;

    return (...args) => {
        if (++count <= amount) {
            return func(...args);
        } else {
            throw new Error('usage limit for this function has been reached');
        }
    };
};

module.exports = {
    limit
};
