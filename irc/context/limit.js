const limit = (func, amount = 10) => {
    let count = 0;

    return (...args) => {
        if (++count <= amount) {
            return func(...args);
        };
    };
};

module.exports = {
    limit
};
