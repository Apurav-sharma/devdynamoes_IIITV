import { connect, File } from '../../../database/connectDB';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { path, patch, newContent, author } = await request.json();

    if (!path || !patch) {
      return NextResponse.json({ message: 'Missing path or patch' }, { status: 400 });
    }

    await connect();

    let file = await File.findOne({ filename: path });

    if (!file) {
      // First save – store base version
      file = await File.create({
        filename: path,
        base: newContent,
        versions: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    else {
      file.versions.push({
        timestamp: new Date(),
        patch: patch,
        author: author || null
      });
      file.updatedAt = new Date();
      await file.save();
    }

    return NextResponse.json({ message: 'Patch saved successfully!' });
  } catch (err) {
    console.error('Error saving patch:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
