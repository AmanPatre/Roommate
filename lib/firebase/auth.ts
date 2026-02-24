import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    User,
    updateProfile,
} from 'firebase/auth';
import { auth } from './config';

export const signUp = async (email: string, password: string, displayName?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) await updateProfile(cred.user, { displayName });
    return cred.user;
};

export const signIn = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password);

export const googleSignIn = () =>
    signInWithPopup(auth, new GoogleAuthProvider());

export const logOut = () => signOut(auth);

export const resetPassword = (email: string) =>
    sendPasswordResetEmail(auth, email);

export const onAuthChange = (callback: (user: User | null) => void) =>
    onAuthStateChanged(auth, callback);
