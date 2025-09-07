import swaggerUi from "swagger-ui-express";
import { Router } from "express";
import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";

const router = Router();

// Load OpenAPI spec
const openApiPath = path.join(__dirname, "../openapi/spec.yaml");
const spec = yaml.load(fs.readFileSync(openApiPath, "utf8")) as Record<
  string,
  any
>;

// Serve Swagger UI
router.use("/", swaggerUi.serve);
router.get(
  "/",
  swaggerUi.setup(spec, {
    customSiteTitle: "lomi.africa API Documentation",
    customfavIcon: "/favicon.ico",
    customCss: ".swagger-ui .topbar { display: none }",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  }),
);

export default router;
