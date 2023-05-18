import cv2
import numpy as np

class MaskTransformerError(Exception):
    pass

class MaskTransformer:
    def extract_edges(self, image: np.ndarray,) -> np.ndarray:
      try:
        img_data = cv2.imread(image)
        img_data = img_data > 128

        img_data = np.asarray(img_data[:, :, 0], dtype=np.double)
        gx, gy = np.gradient(img_data)
        temp_edge = gy * gy + gx * gx
        temp_edge[temp_edge != 0.0] = 255.0
        temp_edge = np.asarray(temp_edge, dtype=np.uint8)

        # Transform mask edge to pixel coordinates
        img_data = cv2.cvtColor(temp_edge, cv2.COLOR_BGR2GRAY)
        img = img_data.astype(np.uint8)
        coord = cv2.findNonZero(img)
        coord = np.squeeze(coord)

        return coord
      except Exception as e:
        raise MaskTransformerError(e)


