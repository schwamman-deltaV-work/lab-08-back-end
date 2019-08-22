DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7)
);

DROP TABLE IF EXISTS weather;

CREATE TABLE weather (
  forecast VARCHAR(255),
  time VARCHAR(255)
);

DROP TABLE IF EXISTS events;

CREATE TABLE events (
  link VARCHAR(255),
  name VARCHAR(255),
  event_date VARCHAR(255),
  summary VARCHAR(2000)
);