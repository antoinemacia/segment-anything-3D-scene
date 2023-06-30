import cv2
import numpy as np
from PIL import Image
import logging
import torch
from io import BytesIO
import os

class MaskTransformerError(Exception):
    def __init__(self, message):
        super().__init__()
        self.message = message


def temp_folder(filename: str):
    return os.path.relpath('demo/lib/api/lib/temp/' + filename)


class MaskTransformer:
    def extract_edges(self, image: np.ndarray) -> np.ndarray:
        try:
            # img_io = BytesIO()
            # pil_image = Image.fromarray(image)
            # pil_image.save(img_io, 'PNG')
            # img_io.seek(0)
            # img_data = cv2.imread(img_io)
            # img_data = img_data > 128
            # im = Image.fromarray(image)
            # im.save(temp_folder("mask.png"))
            # img_data = cv2.imread(temp_folder("mask.png"))

            # image is 2D array of 0 and 1, so we need to convert it to 3D array of 0 and 255
            img_data = np.stack((image * 255,)*3, axis = -1)
            print(img_data.shape)
            img_data = img_data > 128

            img_data = np.asarray(img_data[:, :, 0], dtype=np.double)
            gx, gy = np.gradient(img_data)
            temp_edge = gy * gy + gx * gx
            temp_edge[temp_edge != 0.0] = 255.0
            temp_edge = np.asarray(temp_edge, dtype=np.uint8)
            cv2.imwrite(temp_folder("mask_edge.png"), temp_edge)

            # Transform mask edge to pixel coordinates
            img_data = cv2.imread(temp_folder("mask_edge.png"))
            img_data = cv2.cvtColor(img_data, cv2.COLOR_BGR2GRAY)
            img = img_data.astype(np.uint8)
            coord = cv2.findNonZero(img)
            coord = np.squeeze(coord)

            return coord
        except Exception as e:
            raise MaskTransformerError(e)
