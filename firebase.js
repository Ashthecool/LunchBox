
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
  const firebaseConfig = {
    apiKey: "AIzaSyCzsnzR8HOZ5ybuSITTojBPS-ujAc2ZvqU",
    authDomain: "lunchbox-b23f7.firebaseapp.com",
    projectId: "lunchbox-b23f7",
    storageBucket: "lunchbox-b23f7.firebasestorage.app",
    messagingSenderId: "61025154063",
    appId: "1:61025154063:web:b95602f6711b41f891df7a",
    measurementId: "G-GXK4ZJMX6L"
  };

firebase.initializeApp(firebaseConfig)
console.log('firebase starter med', firebaseConfig.projectId)

var db = firebase.firestore()
console.log('forbndelse til firestore opretet')
