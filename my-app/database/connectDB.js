import mongoose from 'mongoose';

const versionSchema = new mongoose.Schema({
    timestamp: Date,
    patch: String,
    author: {
        name: String,
        email: String
    }
});

const fileSchema = new mongoose.Schema({
    filename: String,
    base: String,
    versions: [versionSchema],
    createdAt: Date,
    updatedAt: Date
});

const MONGODB_URI = "mongodb+srv://202311083:Udit%401893@cluster0.mr6ez58.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"

export const File = mongoose.models.File || mongoose.model('File', fileSchema);

export async function connect() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    }
}