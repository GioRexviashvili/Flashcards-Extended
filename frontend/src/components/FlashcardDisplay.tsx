
import type { Flashcard } from "../types"; 


interface Props {
  card: Flashcard; 
  showBack: boolean; 
}

function FlashcardDisplay({ card, showBack }: Props) {
  return (
    <div className="flashcard">
      {/* Front of the card */}
      <div className="flashcard-front">{card.front}</div>
      
      {/* Divider line */}
      <div className="flashcard-divider"></div>
      
      {/* Back of card (shown conditionally) */}
      <div className={`flashcard-back ${!showBack ? 'flashcard-hidden' : ''}`}>
        {showBack ? card.back : "???"}
      </div>
      
      {/* Display tags if available */}
      {card.tags && card.tags.length > 0 && (
        <div className="flashcard-tags">
          {card.tags.map((tag, index) => (
            <span key={index} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default FlashcardDisplay;