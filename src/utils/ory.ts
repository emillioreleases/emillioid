import { Configuration, OAuth2Api } from "@ory/client"
import { env } from "~/env"

export const ory = new OAuth2Api(
  new Configuration({
    basePath: `https://admiring-haibt-mnd205d9ew.projects.oryapis.com`,
    accessToken: env.ORY_API_KEY,
  }),
)