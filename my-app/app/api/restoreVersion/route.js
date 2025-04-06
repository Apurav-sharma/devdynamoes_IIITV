import { NextResponse } from 'next/server';
import { connect, File } from '../../../database/connectDB';
import { diff_match_patch } from 'diff-match-patch';

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const path = url.searchParams.get('path');
    const version = parseInt(url.searchParams.get('version'), 10);

    if (!path || isNaN(version)) {
      return NextResponse.json({ message: 'Missing path or version' }, { status: 400 });
    }

    await connect(); // ✅ Connect using your mongoose helper

    const fileDoc = await File.findOne({ filename: path });
    if (!fileDoc) {
      return NextResponse.json({ message: 'File not found' }, { status: 404 });
    }

    const dmp = new diff_match_patch();
    let content = fileDoc.base;
    let actualVersion = 0;

    for (let i = 0; i <= version && i < fileDoc.versions.length; i++) {
      const { patch } = fileDoc.versions[i];
      const patches = dmp.patch_fromText(patch);
      const [result] = dmp.patch_apply(patches, content);
      content = result;
      actualVersion = i;
    }

    return NextResponse.json({
      content,
      version: actualVersion,
      totalVersions: fileDoc.versions.length
    });
  } catch (err) {
    console.error('Restore error:', err);
    return NextResponse.json({ message: 'Server error restoring version' }, { status: 500 });
  }
}
