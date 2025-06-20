
import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('database') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No database file provided' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    console.log(`[SAVE DATABASE API] Received database file: ${file.name}, size: ${bytes.byteLength} bytes`);
    
    if (bytes.byteLength === 0) {
      console.warn('[SAVE DATABASE API] Received empty database file. Aborting save.');
      return NextResponse.json(
        { error: 'Received empty database file' },
        { status: 400 }
      );
    }
    
    const buffer = Buffer.from(bytes);

    const publicDir = join(process.cwd(), 'public');
    const filePath = join(publicDir, file.name); 
    
    await writeFile(filePath, buffer);

    console.log(`[SAVE DATABASE API] Successfully wrote ${bytes.byteLength} bytes to: ${filePath}. This will likely trigger a dev server recompilation/restart.`);
    return NextResponse.json({ success: true, message: 'Database saved successfully.' });
  } catch (error) {
    console.error('Error saving database:', error);
    return NextResponse.json(
      { error: 'Failed to save database file' },
      { status: 500 }
    );
  }
}
