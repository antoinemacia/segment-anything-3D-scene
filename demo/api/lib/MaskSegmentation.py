import sys
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import torch
from groundingdino.util.inference import Model
from segment_anything import sam_model_registry, SamPredictor
from urllib.request import urlopen

DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

# GroundingDINO config and checkpoint
GROUNDING_DINO_CONFIG_PATH = "../../GroundingDINO/groundingdino/config/GroundingDINO_SwinT_OGC.py"
GROUNDING_DINO_CHECKPOINT_PATH = "../../GroundingDINO/weights/groundingdino_swint_ogc.pth"

# Segment-Anything checkpoint
SAM_ENCODER_VERSION = "vit_h"
SAM_CHECKPOINT_PATH = "../../sam_vit_h_4b8939.pth"


class MaskSegmentationError(Exception):
    def __init__(self, message):
        super().__init__()
        self.message = message


class MaskSegmentation:
    sam_predictor: SamPredictor
    grounding_dino_model: Model

    def __init__(self):
        self.grounding_dino_model = self.__init_grounding_dino_model()
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

    def __init_grounding_dino_model(self) -> Model:
        return Model(
            model_config_path=GROUNDING_DINO_CONFIG_PATH,
            model_checkpoint_path=GROUNDING_DINO_CHECKPOINT_PATH,
            device=DEVICE
        )

    def __get_image_from_url(self, sourceUrl: str) -> np.ndarray:
        image = url_to_image(sourceUrl)
        return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


def url_to_image(url, readFlag=cv2.IMREAD_COLOR):
    # download the image, convert it to a NumPy array, and then read
    # it into OpenCV format
    resp = urlopen(url)
    image = np.asarray(bytearray(resp.read()), dtype="uint8")
    image = cv2.imdecode(image, readFlag)

    # return the image
    return image
