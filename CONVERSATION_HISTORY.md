I've fixed the Line of Scrimmage issues and made the formations much more distinct and realistic.

**Key Changes:**
1.  **Strict Line of Scrimmage:** I added a safety check to the movement logic. Players will now *never* cross the yellow line of scrimmage when they jitter. Offense stays on the left, defense on the right, with a clear neutral zone buffer.
2.  **Real Formations:** I completely redid the coordinates for **Shotgun**, **I-Formation**, **Trips**, and **Ace**.
    *   **Shotgun:** QB is clearly back 5 yards.
    *   **I-Formation:** You'll clearly see the QB under center, followed by the Fullback and then the Running Back in a straight line.
3.  **Better Detection:** The system now recognizes more terms like "single back", "fullback", and "gun" to correctly trigger these formations.
4.  **UI Feedback:** The "Personnel & Formation" tab now explicitly tells you which formation is active (e.g., "I-FORMATION"), so you can verify it matches what you see.

The visual representation should now be much cleaner and football-accurate.