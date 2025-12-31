import 'dotenv/config';
import app from './app';
import cors from 'cors';

const PORT = process.env.PORT || 4001;

// Override the app's default CORS if possible, or just rely on having updated it in app.ts?
// Actually, CORS is set in app.ts. Modifying server.ts won't change middleware order.
// I need to modify app.ts, NOT server.ts.
// But wait, my previous view showed CORS in `app.ts`.
// Let's modify `app.ts` via write_to_file to be sure.

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
