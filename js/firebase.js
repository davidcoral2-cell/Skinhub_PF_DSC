// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB9G3Iwg7amAwpCZXwGsTVxOP5TJppH9DI",
    authDomain: "skinhub-40408.firebaseapp.com",
    projectId: "skinhub-40408",
    storageBucket: "skinhub-40408.appspot.com",
    messagingSenderId: "380720923974",
    appId: "1:380720923974:web:e3de93b36b68d7e1575147",
    measurementId: "G-7YP7Q61FVC"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
