import { Metadata } from "next";
import MediaLibraryClient from "./MediaLibraryClient";
export const metadata: Metadata = { title: "Media Library | R3sults.org CMS" };
export default function MediaPage() { return <MediaLibraryClient />; }