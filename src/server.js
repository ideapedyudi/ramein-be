import app from "./app.js";
import env from "./config/env.js";
import { connectDatabase  } from "./config/database.js";

async function bootstrap() {
  try {
    await connectDatabase();
    app.listen(env.port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on port ${env.port}`);
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

bootstrap();
