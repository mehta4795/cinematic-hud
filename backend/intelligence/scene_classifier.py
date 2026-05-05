from __future__ import annotations


def classify(subjects: list[dict], faces: list[dict]) -> str:
    """
    Returns one of: 'portrait', 'group', 'close_up', 'landscape', 'general'
    Pure heuristics — no ML required.
    """
    n_faces = len(faces)
    n_subjects = len(subjects)

    if n_faces >= 2:
        return "group"

    if n_faces == 1:
        face = faces[0]
        face_area = face["w"] * face["h"]
        if face_area > 0.12:   # Face covers >12% of 512×512 frame → close-up
            return "close_up"
        return "portrait"

    if n_subjects == 0:
        return "landscape"

    return "general"
