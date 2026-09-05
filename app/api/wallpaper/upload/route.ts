import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const publicDir = path.join(process.cwd(), "public");

    // Save as both image.png and wallpaper-light.png
    fs.writeFileSync(path.join(publicDir, "image.png"), buffer);
    fs.writeFileSync(path.join(publicDir, "wallpaper-light.png"), buffer);

    return NextResponse.json({ success: true, path: "/image.png" });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to upload wallpaper";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
