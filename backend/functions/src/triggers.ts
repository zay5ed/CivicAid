import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { admin } from "./firebase";

import { sendVolunteerAlert } from "./notifications";
import { haversineDistance } from "./utils";

export const onIncidentCreated = onDocumentCreated(
  "incidents/{incidentId}",
  async (event) => {
    const incidentData = event.data?.data();
    if (!incidentData) return;

    const incidentId = event.params.incidentId;
    const { lat, lng } = incidentData.location;

    // Get volunteers
    const volunteers = await admin
      .firestore()
      .collection("volunteers")
      .where("is_online", "==", true)
      .get();

    const nearby: any[] = [];

    volunteers.forEach((doc) => {
      const v = doc.data();
      const d = haversineDistance(lat, lng, v.lat, v.lng);

      if (d <= 5 && v.fcmToken) {
        nearby.push({ id: doc.id, data: v, distance: d });
      }
    });

    // Send alerts
    for (const v of nearby) {
      await sendVolunteerAlert(v.data.fcmToken, incidentId, v.distance);
    }

    console.log("Sent alerts to:", nearby.length);
  }
);
