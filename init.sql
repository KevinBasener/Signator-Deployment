-- Erstellt die Tabelle für allgemeine Geräteinformationen und Spannung
CREATE TABLE public.battery_info (
                                     id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
                                     battery_voltage real NOT NULL,
                                     CONSTRAINT battery_info_pkey PRIMARY KEY (id)
);

-- Erstellt die Tabelle für gebuchte Events
CREATE TABLE public.booked_events (
                                      id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
                                      date date NOT NULL,
                                      title text,
                                      CONSTRAINT booked_events_pkey PRIMARY KEY (id)
);

-- Erstellt die Tabelle zur Protokollierung der Geräteaktivität
CREATE TABLE public.device_activity (
                                        id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
                                        device_id bigint NOT NULL,
                                        active_duration_s real NOT NULL,
                                        created_at timestamp with time zone NOT NULL DEFAULT now(),
                                        CONSTRAINT device_activity_pkey PRIMARY KEY (id),
                                        CONSTRAINT device_activity_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.battery_info(id)
);

-- Erstellt die Tabelle zur Zuordnung von Bildern zu Events und Displays
CREATE TABLE public.scheduled_images (
                                         image_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
    -- 'image_url' wird zu 'image_data' mit dem Typ BYTEA für binäre Daten
                                         image_data BYTEA,
    -- 'content_type' speichert, ob es ein JPEG, PNG etc. ist
                                         content_type VARCHAR(50),
                                         display_id bigint,
                                         event_id bigint,
                                         CONSTRAINT scheduled_images_pkey PRIMARY KEY (image_id),
                                         CONSTRAINT scheduled_images_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.booked_events(id)
);