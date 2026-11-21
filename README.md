# Doomsday Ready

**Status:** In development

Doomsday Ready is a full-stack app for MCU fans preparing for _Avengers: Doomsday_. It helps users plan the movies they need to rewatch and calculate opening-night cinema seat bundles for a group.

This project is being developed as a full-stack internship assessment.

## Planned features

- Create and update movies, including prerequisites and watched status.
- Show the prerequisite movies for a selected target in a valid watch order, with watched progress and remaining runtime.
- Create cinemas with their available seat bundle sizes.
- Calculate the fewest bundles that exactly fit a group, or report when an exact booking is not possible.
- Provide a React interface for movies, rewatch plans, and booking quotes.

Movie prerequisite cycles must be rejected with HTTP `409` and error code `CIRCULAR_DEPENDENCY`.

## Technology

- Frontend: React and JavaScript
- Backend: Node.js, Express, and JavaScript
- Database: PostgreSQL

## Project structure

```text
apps/
  api/    Express API and database migrations
  web/    React frontend
```

## Data model

```mermaid
erDiagram
    MOVIE ||--o{ MOVIE_PREREQUISITE : "requires"
    MOVIE ||--o{ MOVIE_PREREQUISITE : "is prerequisite for"
    CINEMA ||--|{ CINEMA_BUNDLE : "offers"

    MOVIE {
        integer id PK
        string title UK
        integer release_year
        integer runtime_minutes
        boolean watched
    }

    MOVIE_PREREQUISITE {
        integer movie_id FK
        integer prerequisite_movie_id FK
    }

    CINEMA {
        integer id PK
        string name UK
    }

    CINEMA_BUNDLE {
        integer id PK
        integer cinema_id FK
        integer seat_count
    }
```

The diagram describes the intended data model and may be updated to match the final implementation.

## Getting started

### Run the API and PostgreSQL with Docker

From the project root:

````powershell
docker compose up --build



```markdown
## AI use

I used AI to discuss the project plan and structure, initial documentation and frontend code based on the supplied design. I reviewed and manually tested the resulting application. I implemented and verified the rewatch-order, circular-dependency, and minimum-bundle logic myself, as required by the assessment.
````
