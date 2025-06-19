
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

    // Convert the file to a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save the file to the public directory
    // process.cwd() gives the root of your Next.js project
    const publicDir = join(process.cwd(), 'public');
    const filePath = join(publicDir, 'vendors.db');
    
    await writeFile(filePath, buffer);

    console.log(`[SAVE DATABASE API] Successfully wrote to: ${filePath}. This will likely trigger a dev server recompilation/restart.`);
    return NextResponse.json({ success: true, message: 'Database saved successfully.' });
  } catch (error) {
    console.error('Error saving database:', error);
    return NextResponse.json(
      { error: 'Failed to save database file' },
      { status: 500 }
    );
  }
}
