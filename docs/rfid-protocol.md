# Protocole lecteur RFID

Ce document decrit le contrat minimal entre un lecteur RFID embarque et l'API Django.

## Endpoint

`POST /api/rfid/scan/`

Authentification : token DRF.

```http
Authorization: Token <token-du-terminal>
Content-Type: application/json
```

## Requete

```json
{
  "uid": "04A1B2C3",
  "source": "gate-main-01",
  "request_id": "gate-main-01-20260701-151530-0001",
  "timestamp": "2026-07-01T15:15:30+02:00"
}
```

Champs :

- `uid` : identifiant lu sur la carte RFID, obligatoire.
- `source` : identifiant stable du lecteur ou portique, optionnel mais recommande.
- `request_id` : identifiant unique genere par le lecteur, recommande pour rendre les retries idempotents.
- `timestamp` : date locale du scan cote lecteur, optionnelle. Le serveur garde son propre `created_at`.

## Reponse

```json
{
  "allowed": true,
  "result": "allowed",
  "reason": "none",
  "message": "Acces autorise",
  "duplicate": false,
  "event": {
    "id": 123,
    "uid": "04A1B2C3",
    "student_name": "Jane Doe (ETSIA-001)",
    "result": "allowed",
    "reason": "none",
    "source": "gate-main-01",
    "created_at": "2026-07-01T13:15:30Z"
  }
}
```

## Motifs de refus

- `unknown_card` : UID inconnu.
- `disabled_card` : carte desactivee.
- `expired_card` : carte expiree.
- `lost_card` : carte perdue.
- `unpaid_fees` : frais impayes et blocage actif.
- `outside_schedule` : scan hors plage horaire autorisee.
- `inactive_enrollment` : aucune inscription active.

## Algorithme serveur

1. Verifier l'idempotence avec `source + request_id`.
2. Ignorer les doubles scans du meme `uid` sur la meme `source` dans la fenetre configuree.
3. Rechercher la carte par `uid`.
4. Verifier statut et expiration automatique.
5. Verifier l'inscription active.
6. Verifier le statut financier si la regle est active.
7. Verifier la plage horaire autorisee.
8. Creer un `AccessEvent` avec le resultat final.

## Recommandations embarque

- Utiliser HTTP au debut, avec un timeout court et 2 ou 3 retries.
- Generer un `request_id` stable par scan, et reutiliser le meme `request_id` pendant les retries.
- Afficher localement une decision simple : vert si `allowed=true`, rouge sinon.
- Journaliser localement les scans non transmis si le reseau tombe, puis les rejouer avec le meme `request_id`.
- Passer a MQTT seulement si plusieurs lecteurs doivent fonctionner avec un bus temps reel centralise.
