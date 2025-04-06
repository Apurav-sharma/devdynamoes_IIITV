import { connect, File } from '../../../database/connectDB';
import DiffMatchPatch from 'diff-match-patch';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  console.log('path', path);
  console.log('request.url', searchParams);

  if (!path) {
    return new Response(JSON.stringify({ message: 'Missing file path' }), { status: 400 });
  }

  await connect();

  const file = await File.findOne({ filename: path });
  if (!file) {
    return new Response(JSON.stringify({ latestContent: '' }), { status: 200 });
  }

  const dmp = new DiffMatchPatch();
  let content = file.base;

  for (const version of file.versions) {
    const [patched] = dmp.patch_apply(dmp.patch_fromText(version.patch), content);
    content = patched;
  }

  return new Response(JSON.stringify({
    filename: file.filename,
    latestContent: content,
    versionCount: file.versions.length
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
