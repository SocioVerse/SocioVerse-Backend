const mongoose = require("mongoose");



const connectWithDb = () => {
    mongoose
        .connect(process.env.DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        })
        .then(console.log(`DB got connected!`))
        .catch((err) => {
            console.log(`DB got issues`);
            console.log(err);
            process.exit(1);
        });
};

module.exports = connectWithDb;