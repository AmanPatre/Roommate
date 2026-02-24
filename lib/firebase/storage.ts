import {
    ref,
    uploadBytes,
    getDownloadURL,
    uploadBytesResumable,
} from 'firebase/storage';
import { storage } from './config';

export async function uploadFile(
    path: string,
    file: File | Blob,
    onProgress?: (pct: number) => void
): Promise<string> {
    const storageRef = ref(storage, path);
    if (onProgress) {
        return new Promise((resolve, reject) => {
            const task = uploadBytesResumable(storageRef, file);
            task.on(
                'state_changed',
                (snap) => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
                reject,
                async () => resolve(await getDownloadURL(task.snapshot.ref))
            );
        });
    }
    const snap = await uploadBytes(storageRef, file);
    return getDownloadURL(snap.ref);
}

export async function getFileUrl(path: string): Promise<string> {
    return getDownloadURL(ref(storage, path));
}
