#!/usr/bin/env python3
"""Construye los datos estructurados de la portada desde el catálogo.

Google arma la ficha de un alojamiento con estos campos. Escribirlos a mano
significa que el día que cambie una tarifa o entre una habitación, el sitio
diga una cosa y Google otra, sin que nada se queje. Las habitaciones salen de
docs/habitaciones-airtable.csv, el mismo archivo del que vive la página de
alojamiento.

Los datos del negocio no salen del CSV porque no están ahí: son del sitio
—teléfono y correo de contacto, coordenadas del mapa— y se declaran acá.

Uso: python3 tools/schema-hotel.py
"""
import csv
import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent
CATALOGO = RAIZ / "docs" / "habitaciones-airtable.csv"
PORTADA = RAIZ / "index.html"

NEGOCIO = {
    "@context": "https://schema.org",
    "@type": "Hotel",
    "name": "Flor del Bosque",
    "description": "Alojamiento en entorno natural a orillas del Río Toltén, "
                   "con vista al Volcán Villarrica.",
    "url": "https://flordelbosque.cl/",
    "image": "https://flordelbosque.cl/images/og-image.jpg",
    "telephone": "+56985488233",
    "email": "hola@flordelbosque.cl",
    "priceRange": "CLP 50.000–55.000",
    "currenciesAccepted": "CLP",
    "address": {
        "@type": "PostalAddress",
        "streetAddress": "Orillas del Río Toltén",
        "addressLocality": "Villarrica",
        "addressRegion": "La Araucanía",
        "addressCountry": "CL",
    },
    # Del mapa incrustado en pages/contacto.html.
    "geo": {"@type": "GeoCoordinates", "latitude": -39.2614638, "longitude": -72.2383335},
    "sameAs": ["https://instagram.com/hostalflordelbosque"],
    "amenityFeature": [
        {"@type": "LocationFeatureSpecification", "name": n, "value": True}
        for n in ["WiFi", "Estacionamiento", "Piscina", "CoWork",
                  "Desayuno", "Cocina compartida", "Jardín"]
    ],
}


def habitaciones():
    with CATALOGO.open(encoding="utf-8") as f:
        for fila in csv.DictReader(f):
            if fila["activa"].strip().lower() != "true":
                continue
            yield {
                "@type": "Offer",
                "itemOffered": {
                    "@type": "HotelRoom",
                    "name": fila["nombre"],
                    "description": fila["descripcion_es"],
                    "occupancy": {
                        "@type": "QuantitativeValue",
                        "maxValue": int(fila["capacidad"]),
                    },
                },
                "price": fila["precio_noche"],
                "priceCurrency": "CLP",
            }


def main():
    if not CATALOGO.is_file():
        sys.exit(f"No existe {CATALOGO.relative_to(RAIZ)}.")

    datos = dict(NEGOCIO)
    datos["makesOffer"] = list(habitaciones())
    bloque = json.dumps(datos, ensure_ascii=False, indent=2)

    texto = PORTADA.read_text(encoding="utf-8")
    patron = re.compile(
        r'(<script type="application/ld\+json">)[\s\S]*?(</script>)')
    if not patron.search(texto):
        sys.exit("index.html no tiene un bloque de datos estructurados que reemplazar.")
    # Sólo el primero: si mañana la portada suma otro bloque —unas preguntas
    # frecuentes, por ejemplo— no hay que pisarlo.
    nuevo = patron.sub(lambda m: f"{m.group(1)}\n{bloque}\n  {m.group(2)}", texto, count=1)
    PORTADA.write_text(nuevo, encoding="utf-8")
    print(f"Hotel con {len(datos['makesOffer'])} habitaciones -> index.html")


if __name__ == "__main__":
    main()
