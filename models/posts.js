const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    title: { type: String, requried: true },
    body: { type: String, requried: true },
    author: { type: String, requried: true },
    comment: [{ type: mongoose.Types.ObjectId, ref: "Comment" }]
})

module.exports = mongoose.model("Post", postSchema);