import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes/index.js";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();
const bodyLimit = "10mb";

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: bodyLimit }));

app.use("/api/v1", routes);
app.use(notFound);
app.use(errorHandler);

export default app;
