const mongoose = require('mongoose');
const { z } = require('zod');

const CommentSchema = new mongoose.Schema({
    _id: String,
    username: String,
    comment: String,
    date: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
    _id: String,
    username: String,
    images:[{
        data: Buffer,
        contentType: String
    }],
    description: String,
    date: { type: Date, default: Date.now },
    likes: [],
    comments: [CommentSchema]
} , { collection: 'Posts' });

module.exports = {
    PostSchema: mongoose.model('PostSchema', PostSchema)
    // validatePost
};