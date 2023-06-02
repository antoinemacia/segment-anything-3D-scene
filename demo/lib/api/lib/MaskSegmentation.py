import os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import torch
from segment_anything import sam_model_registry, SamPredictor
from urllib.request import urlopen

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# Segment-Anything checkpoint
SAM_ENCODER_VERSION = "vit_h"
SAM_CHECKPOINT_PATH = os.path.relpath("lib/sam/sam_vit_h_4b8939.pth")

class MaskSegmentationError(Exception):
    def __init__(self, message):
        super().__init__()
        self.message = message


class MaskSegmentation:
    sam_predictor: SamPredictor

    def __init__(self):
        self.sam_predictor = self.__init_sam_predictor()

    def segment_from_pixel_coords(self, sourceUrl: str, pixel_coords: list[float]) -> np.ndarray:
        try:
            image = self.__get_image_from_url(sourceUrl)
            self.sam_predictor.set_image(image)

            if len(pixel_coords) != 2:
                raise ValueError(
                    "Input points must be a list of 2 pixel coordinates (x, y)")

            input_point = np.array([pixel_coords])
            input_label = np.array([1])

            return self.__predict_mask_from_sam(input_point, input_label)
        except Exception as e:
            raise MaskSegmentationError(e)

    def __predict_mask_from_sam(self, input_point: np.ndarray, input_label: np.ndarray) -> np.ndarray:
        masks, scores, _logits = self.sam_predictor.predict(
            point_coords=input_point,
            point_labels=input_label,
            multimask_output=True,
        )

        # Select highest scoring mask
        highest_score_mask = max(zip(masks, scores), key=lambda x: x[1])
        mask = highest_score_mask[0]

        return mask

    def __init_sam_predictor(self) -> SamPredictor:
        sam = sam_model_registry[SAM_ENCODER_VERSION](
            checkpoint=SAM_CHECKPOINT_PATH)
        sam.to(device=DEVICE)
        return SamPredictor(sam)

    def __get_image_from_url(self, sourceUrl: str) -> np.ndarray:
        image = url_to_image(sourceUrl)
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def url_to_image(url, readFlag=cv2.IMREAD_COLOR):
    resp = urlopen(url)
    image = np.asarray(bytearray(resp.read()), dtype="uint8")
    image = cv2.imdecode(image, readFlag)

    # return the image
    return image
