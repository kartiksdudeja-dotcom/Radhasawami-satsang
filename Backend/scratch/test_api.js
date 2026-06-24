import axios from 'axios';

async function test() {
    try {
        const res = await axios.post('http://localhost:5000/api/auth/check-role', {
            username: 'NON_EXISTENT_USER'
        });
        console.log('Non-existent user:', res.data);
        
        const res2 = await axios.post('http://localhost:5000/api/auth/check-role', {
            username: 'AKO05062022PUNE091651 '
        });
        console.log('Regular user:', res2.data);
    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
